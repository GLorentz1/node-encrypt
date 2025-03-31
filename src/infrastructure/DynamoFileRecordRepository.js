
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

    async delete(table, param) {
        try {
            const params = {
                TableName: table,
                Key: param,
            };

            await this.client.delete(params).promise();
        } catch (error) {
            console.error('Error deleting from DynamoDB:', error);
            throw new Error('Could not delete from DynamoDB');
        }
    }

    async update(table, id, updates) {
        try {
            const updateExpressionParts = []
            const expressionAttributeValues = {}
            const expressionAttributeNames = {}

            for (const [k, v] of Object.entries(updates)) {
                updateExpressionParts.push(`#${k} = :${k}`);
                expressionAttributeValues[`:${k}`] = v;
                expressionAttributeNames[`#${k}`] = k;
            }

            const updateExpression = `SET ${updateExpressionParts.join(', ')}`;

            const params = {
                TableName: table,
                Key: { id: id },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues
            };

            await this.client.update(params).promise();
        } catch (error) {
            console.error('Error updating DynamoDB:', error);
            throw new Error('Failed to update DynamoDB');
        }
    }
}

module.exports = DynamoFileRecordRepository