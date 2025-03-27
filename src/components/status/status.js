
const TABLE_NAME = process.env.DYNAMODB_TABLE;

module.exports.status = (fileRecordRepository) => {
    const handler = async (event) => {
        try {
            const id = event.queryStringParameters?.id;

            if (!id) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Missing 'id' query parameter" }),
                };
            }

            let record = await fileRecordRepository.get(TABLE_NAME, { id: id } );

            return {
                statusCode: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: id,
                    status: record.status,
                }),
            };

        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify(
                    {message: "Failed retrieving status.", error: error.message}
                )
            }
        }
    }

    return {handler};
};
