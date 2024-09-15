
class DynamoFileRecordRepository {
    constructor(client) {
        this.client = client;
    }

    async add(table, input) {
        try {
            const dbParams = {
                TableName: table,
                Item: input
            }
            await this.client.put(dbParams).promise();
        } catch (error) {
            console.error('Error saving to DynamoDB:', error);
            throw new Error('Could not save to DynamoDB');
        }
    }

    async get(table, param) {
        try {
            const params = {
                TableName: table,
                Key: param,
            };

            const result = await this.client.get(params).promise();
            return result?.Item;
        } catch (error) {
            console.error('Error getting from DynamoDB:', error);
            throw new Error('Could not get from DynamoDB');
        }
    }

    async update(table, id, field, value) {
        try {
            const params = {
                TableName: table,
                Key: { id: id },
                UpdateExpression: `set #field = :value`,
                ExpressionAttributeNames: { "#field": field },
                ExpressionAttributeValues: { ":value": value }
            };

            await this.client.update(params).promise();
            console.log(`Updated ${field} to ${value} for ID ${id}`);

        } catch (error) {
            console.error('Error updating DynamoDB:', error);
            throw new Error('Failed to update DynamoDB');
        }
    }
}

module.exports = DynamoFileRecordRepository