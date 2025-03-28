process.env.DYNAMODB_TABLE = "dynamoTable";

const S3FileRepository = require("../../../../src/infrastructure/S3FileRepository")
const DynamoFileRecordRepository = require("../../../../src/infrastructure/DynamoFileRecordRepository")
const EncryptionService = require("../../../../src/infrastructure/EncryptionService")
const {decrypt} = require("../../../../src/components/decryption/decryption")
const {Readable} = require("stream");
const {PassThrough} = require("node:stream");

jest.mock('../../../../src/infrastructure/DynamoFileRecordRepository.js');
jest.mock('../../../../src/infrastructure/S3FileRepository.js');
jest.mock('../../../../src/infrastructure/EncryptionService.js');

describe('Encryption handler', () => {
    let handler, s3Repository, dynamoRepository, encryptionService;

    beforeEach(() => {
        s3Repository = {
            get: jest.fn().mockResolvedValue({
                key: "to_decrypt/0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77/test.txt",
                Body: Readable.from(["mocked file content"])
            }),
            add: jest.fn(),
            delete: jest.fn(),
        };

        dynamoRepository = new DynamoFileRecordRepository();

        encryptionService = {
            decrypt: jest.fn().mockImplementation(async (password, salt, iv) => {
                const stream = new PassThrough();
                process.nextTick(() => {
                    stream.end("mocked decrypted content");
                });
                return stream;
            })
        };

        handler = decrypt(s3Repository, dynamoRepository, encryptionService).handler;
    });


    it('should interact with repositories and decrypt file', async () => {
        const event = {

            "Records": [
                {
                    "s3": {
                        "s3SchemaVersion": "1.0",
                        "configurationId": "file-upload-service-dev-uploadFinished-8f8480efdb1b96103a36510f80686c78",
                        "bucket": {
                            "name": "serverless-node-goencrypt",
                            "ownerIdentity": {
                                "principalId": "APJ6NAUQWTHD4"
                            },
                            "arn": "arn:aws:s3:::serverless-node-goencrypt"
                        },
                        "object": {
                            "key": "to_decrypt/0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77/test.txt",
                            "size": 11956,
                            "eTag": "202d828553b777121238d45de1eb2d38",
                            "sequencer": "0066E756492F8AC0BB"
                        }
                    }
                }
            ]
        }

        dynamoRepository.get.mockResolvedValue({
            "id": "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77",
            "createdAt": 1726187088161,
            "encryption_iv": "607d72da5e4c8be553e5e1d8da1ab79e",
            "encryption_salt": "ce4a555624d36324b861b7909f87975f",
            "filename": "test.txt",
            "hashedPassword": "$2a$10$GjN4TdtozdJWRptrvieGiO.Q6aC9f1fED.OLbwgBDN.JXdYXZzTl.",
            "status": "decrypting"
        })

        await handler(event);

        expect(dynamoRepository.update).toHaveBeenCalledWith("dynamoTable", "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77", {"status": "decrypting"})
        expect(dynamoRepository.get).toHaveBeenCalledWith("dynamoTable", {id: "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77"})
        expect(s3Repository.get).toHaveBeenCalledWith({key: "to_decrypt/0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77/test.txt"})
        expect(s3Repository.add).toHaveBeenLastCalledWith(expect.objectContaining({
            key: "decrypted/0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77/test.txt",
            body: expect.anything()
        }))
        expect(dynamoRepository.update).toHaveBeenCalledWith("dynamoTable", "0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77", {"status": "decrypted"})
        expect(s3Repository.delete).toHaveBeenLastCalledWith({ key: "to_decrypt/0c0fb1d1-f249-42b7-99e2-4e9dc47e6e77/test.txt"})
    })
});




