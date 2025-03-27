const { status }  = require("./status")

const DynamoFileRecordRepository = require("../../infrastructure/DynamoFileRecordRepository");
const AWS = require("aws-sdk");

const dynamoClient =  new AWS.DynamoDB.DocumentClient();
const dynamoRepository = new DynamoFileRecordRepository(dynamoClient);

const { handler } =  status(dynamoRepository);

module.exports.handler = handler;