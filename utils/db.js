const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.putInDynamoDBTable = async (table, input ) => {
    try {
        const dbParams = {
            TableName: table,
            Item: input
        }
        await dynamoDb.put(dbParams).promise();
    } catch (error) {
        console.error('Error saving to DynamoDB:', error);
        throw new Error('Could not save to DynamoDB');
    }
};

module.exports.getFromDynamoDBTable = async (table, param) => {
    try {
        const params = {
            TableName: table,
            Key: param,
        };

        const result = await dynamoDb.get(params).promise();
        return result.Item;
    } catch (error) {
        console.error('Error getting from DynamoDB:', error);
        throw new Error('Could not get from DynamoDB');
    }
}

module.exports.updateInDynamoDBTable = async (table, id, field, value) => {
    try {
        const params = {
            TableName: table,
            Key: { id: id },
            UpdateExpression: `set #field = :value`,
            ExpressionAttributeNames: { "#field": field },
            ExpressionAttributeValues: { ":value": value }
        };

        await dynamoDb.update(params).promise();
        console.log(`Updated ${field} to ${value} for ID ${id}`);

    } catch (error) {
        console.error('Error updating DynamoDB:', error);
        throw new Error('Failed to update DynamoDB');
    }
};