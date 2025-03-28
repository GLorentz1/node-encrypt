process.env.DYNAMODB_TABLE = "dynamoTable";

const S3FileRepository  = require("../../../../src/infrastructure/S3FileRepository")
const DynamoFileRecordRepository = require("../../../../src/infrastructure/DynamoFileRecordRepository")
const EncryptionService = require("../../../../src/infrastructure/EncryptionService")
const { update } = require("../../../../src/components/update/update")

jest.mock('../../../../src/infrastructure/DynamoFileRecordRepository.js');
jest.mock('../../../../src/infrastructure/S3FileRepository.js');
jest.mock('../../../../src/infrastructure/EncryptionService.js');

describe('Update handler', () => {
    let handler, s3Repository, dynamoRepository, encryptionService;

    beforeEach(() => {
        s3Repository = new S3FileRepository();
        dynamoRepository = new DynamoFileRecordRepository();
        encryptionService = new EncryptionService();

        handler = update(s3Repository, dynamoRepository, encryptionService).handler;
    });

    it('should create presigned url for reuploading file if passwords match and file is encrypted', async () => {
        const event = {
            body: JSON.stringify({uuid: "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77", filename: "newname.txt", password: 'password123'})
        };

        dynamoRepository.get.mockResolvedValue({
            "id": "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77",
            "createdAt": 1726187088161,
            "encryption_iv": "607d72da5e4c8be553e5e1d8da1ab79e",
            "encryption_salt": "ce4a555624d36324b861b7909f87975f",
            "filename": "test.txt",
            "hashedPassword": "$2a$10$GjN4TdtozdJWRptrvieGiO.Q6aC9f1fED.OLbwgBDN.JXdYXZzTl.",
            "status": "encrypted"
        })

        encryptionService.compare.mockResolvedValue(true)

        await handler(event);

        expect(dynamoRepository.get).toHaveBeenCalledWith("dynamoTable", {id: "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77"})
        expect(encryptionService.compare).toHaveBeenCalledWith("password123", "$2a$10$GjN4TdtozdJWRptrvieGiO.Q6aC9f1fED.OLbwgBDN.JXdYXZzTl.");
        expect(dynamoRepository.update).toHaveBeenCalledWith("dynamoTable", "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77", {"filename": "newname.txt", "status": "pending_upload"} )
        expect(s3Repository.generateUploadUrl).toHaveBeenCalledWith({ key: "uploads/0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77/newname.txt" });
        expect(s3Repository.delete).toHaveBeenCalledWith({ key: "encrypted/0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77/test.txt" });
    });

    it('should return status code 400 if passwords dont match', async () => {
        const event = {
            body: JSON.stringify({uuid: "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77", filename: "newname.txt", password: 'password123'})
        };

        dynamoRepository.get.mockResolvedValue({
            "id": "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77",
            "createdAt": 1726187088161,
            "encryption_iv": "607d72da5e4c8be553e5e1d8da1ab79e",
            "encryption_salt": "ce4a555624d36324b861b7909f87975f",
            "filename": "test.txt",
            "hashedPassword": "$2a$10$GjN4TdtozdJWRptrvieGiO.Q6aC9f1fED.OLbwgBDN.JXdYXZzTl.",
            "status": "encrypted"
        })

        encryptionService.compare.mockResolvedValue(false)

        const result = await handler(event);
        expect(result.statusCode).toEqual(400)
    })
    it('should return status code 403 if passwords dont match and file status is other than encrypted', async () => {
        const event = {
            body: JSON.stringify({uuid: "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77", filename: "newname.txt", password: 'password123'})
        };

        dynamoRepository.get.mockResolvedValue({
            "id": "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77",
            "createdAt": 1726187088161,
            "encryption_iv": "607d72da5e4c8be553e5e1d8da1ab79e",
            "encryption_salt": "ce4a555624d36324b861b7909f87975f",
            "filename": "test.txt",
            "hashedPassword": "$2a$10$GjN4TdtozdJWRptrvieGiO.Q6aC9f1fED.OLbwgBDN.JXdYXZzTl.",
            "status": "decrypted"
        })

        encryptionService.compare.mockResolvedValue(true)

        const result = await handler(event);
        expect(result.statusCode).toEqual(403)
    })
});




