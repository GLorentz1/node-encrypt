const S3FileRepository  = require("../../../../src/infrastructure/S3FileRepository")
const DynamoFileRecordRepository = require("../../../../src/infrastructure/DynamoFileRecordRepository")
const EncryptionService = require("../../../../src/infrastructure/EncryptionService")
const { upload } = require("../../../../src/components/upload/upload")

jest.mock('../../../../src/infrastructure/DynamoFileRecordRepository.js');
jest.mock('../../../../src/infrastructure/S3FileRepository.js');
jest.mock('../../../../src/infrastructure/EncryptionService.js');

describe('Upload handler', () => {
    let handler, s3Repository, dynamoRepository, encryptionService;

    beforeEach(() => {
        s3Repository = new S3FileRepository();
        dynamoRepository = new DynamoFileRecordRepository();
        encryptionService = new EncryptionService();

        handler = upload(s3Repository, dynamoRepository, encryptionService).handler;
    });

    it('should save information to file record repository and generate upload presigned url', async () => {
        const event = {
            body: JSON.stringify({filename: 'test.txt', password: 'password123'})
        };

        encryptionService.hash.mockResolvedValue("hashedPassword")
        s3Repository.generateUploadUrl.mockResolvedValue('https://test-upload-url.com');
        dynamoRepository.add.mockResolvedValue();

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual({
            id: expect.any(String),
            uploadUrl: 'https://test-upload-url.com',
        });

        expect(encryptionService.hash).toHaveBeenCalledWith('password123');
        expect(s3Repository.generateUploadUrl).toHaveBeenCalledWith({ key: expect.stringContaining('test.txt') });
    });
});




