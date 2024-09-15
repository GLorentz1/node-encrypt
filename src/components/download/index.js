const { download }  = require("./download")

const S3FileRepository = require("../../infrastructure/S3FileRepository");
const DynamoFileRecordRepository = require("../../infrastructure/DynamoFileRecordRepository");
const EncryptionService = require("../../infrastructure/EncryptionService");
const {S3Client} = require("@aws-sdk/client-s3");
const AWS = require("aws-sdk");

const s3Client = new S3Client();
const BUCKET_NAME = process.env.S3_BUCKET;
const s3Repository = new S3FileRepository(s3Client, BUCKET_NAME);

const dynamoClient =  new AWS.DynamoDB.DocumentClient();
const dynamoRepository = new DynamoFileRecordRepository(dynamoClient);

const encryptionService = new EncryptionService();
const { handler } =  download(s3Repository, dynamoRepository, encryptionService);

module.exports.handler = handler;