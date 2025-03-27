process.env.DYNAMODB_TABLE = "dynamoTable";

const S3FileRepository  = require("../../../../src/infrastructure/S3FileRepository")
const DynamoFileRecordRepository = require("../../../../src/infrastructure/DynamoFileRecordRepository")
const EncryptionService = require("../../../../src/infrastructure/EncryptionService")
const { download } = require("../../../../src/components/download/download")
const {Readable} = require("stream");

jest.mock('../../../../src/infrastructure/DynamoFileRecordRepository.js');
jest.mock('../../../../src/infrastructure/S3FileRepository.js');
jest.mock('../../../../src/infrastructure/EncryptionService.js');

describe('Download handler', () => {
    let handler, s3Repository, dynamoRepository, encryptionService;

    beforeEach(() => {
        s3Repository = new S3FileRepository();
        dynamoRepository = new DynamoFileRecordRepository();
        encryptionService = new EncryptionService();

        handler = download(s3Repository, dynamoRepository, encryptionService).handler;
    });

    it('should start decryption if password matches and file is encrypted', async () => {
        const event = {
            body: JSON.stringify({uuid: '0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77', password: 'password123'})
        };

        encryptionService.compare.mockResolvedValue(true)
        dynamoRepository.get.mockResolvedValue({
            "id": "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77",
            "createdAt": 1726187088161,
            "encryption_iv": "607d72da5e4c8be553e5e1d8da1ab79e",
            "encryption_salt": "ce4a555624d36324b861b7909f87975f",
            "filename": "test.txt",
            "hashedPassword": "$2a$10$GjN4TdtozdJWRptrvieGiO.Q6aC9f1fED.OLbwgBDN.JXdYXZzTl.",
            "status": "encrypted"
        })
        s3Repository.get.mockResolvedValue({Body: Readable.from(["mocked file content"])})

        await handler(event);

        expect(dynamoRepository.get).toHaveBeenCalledWith("dynamoTable", {id: "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77"})
        expect(encryptionService.compare).toHaveBeenCalledWith('password123', "$2a$10$GjN4TdtozdJWRptrvieGiO.Q6aC9f1fED.OLbwgBDN.JXdYXZzTl.");
        expect(s3Repository.get).toHaveBeenCalledWith({key: "encrypted/0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77/test.txt"})
        expect(s3Repository.add).toHaveBeenLastCalledWith(expect.objectContaining({
            key: "to_decrypt/0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77/test.txt",
            body: expect.anything()
        }))
        expect(s3Repository.delete).toHaveBeenLastCalledWith({ key: "encrypted/0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77/test.txt"})

    });

    it('should return download url if password matches and file has finished decrypting', async () => {
        const event = {
            body: JSON.stringify({uuid: '0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77', password: 'password123'})
        };

        encryptionService.compare.mockResolvedValue(true)
        dynamoRepository.get.mockResolvedValue({
            "id": "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77",
            "createdAt": 1726187088161,
            "encryption_iv": "607d72da5e4c8be553e5e1d8da1ab79e",
            "encryption_salt": "ce4a555624d36324b861b7909f87975f",
            "filename": "test.txt",
            "hashedPassword": "$2a$10$GjN4TdtozdJWRptrvieGiO.Q6aC9f1fED.OLbwgBDN.JXdYXZzTl.",
            "status": "decrypted"
        })

        await handler(event);

        expect(dynamoRepository.get).toHaveBeenCalledWith("dynamoTable", {id: "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77"})
        expect(encryptionService.compare).toHaveBeenCalledWith('password123', "$2a$10$GjN4TdtozdJWRptrvieGiO.Q6aC9f1fED.OLbwgBDN.JXdYXZzTl.");
        expect(s3Repository.generateDownloadUrl).toHaveBeenCalledWith({ key: "decrypted/0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77/test.txt" })
    });


    it('should return 400 if passwords dont match', async () => {
        const event = {
            body: JSON.stringify({uuid: '0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77', password: 'password123'})
        };

        encryptionService.compare.mockResolvedValue(false)
        dynamoRepository.get.mockResolvedValue({
            "id": "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77",
            "createdAt": 1726187088161,
            "encryption_iv": "607d72da5e4c8be553e5e1d8da1ab79e",
            "encryption_salt": "ce4a555624d36324b861b7909f87975f",
            "filename": "test.txt",
            "hashedPassword": "$2a$10$GjN4TdtozdJWRptrvieGiO.Q6aC9f1fED.OLbwgBDN.JXdYXZzTl.",
            "status": "decrypted"
        })

        let result = await handler(event);

        expect(result.statusCode).toBe(400);
        expect(dynamoRepository.get).toHaveBeenCalledWith("dynamoTable", {id: "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77"})
        expect(encryptionService.compare).toHaveBeenCalledWith('password123', "$2a$10$GjN4TdtozdJWRptrvieGiO.Q6aC9f1fED.OLbwgBDN.JXdYXZzTl.");
    });

    it('should return 200 if encryption is in progress', async () => {
        const event = {
            body: JSON.stringify({uuid: '0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77', password: 'password123'})
        };

        encryptionService.compare.mockResolvedValue(true)
        dynamoRepository.get.mockResolvedValue({
            "id": "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77",
            "createdAt": 1726187088161,
            "encryption_iv": "607d72da5e4c8be553e5e1d8da1ab79e",
            "encryption_salt": "ce4a555624d36324b861b7909f87975f",
            "filename": "test.txt",
            "hashedPassword": "$2a$10$GjN4TdtozdJWRptrvieGiO.Q6aC9f1fED.OLbwgBDN.JXdYXZzTl.",
            "status": "decrypting"
        })

        let result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual({
            message: "Decryption in progress."
        });
        expect(dynamoRepository.get).toHaveBeenCalledWith("dynamoTable", {id: "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77"})
        expect(encryptionService.compare).toHaveBeenCalledWith('password123', "$2a$10$GjN4TdtozdJWRptrvieGiO.Q6aC9f1fED.OLbwgBDN.JXdYXZzTl.");
    });
});




