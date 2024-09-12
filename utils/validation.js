
module.exports.validateString = function(input, field) {
    console.log(input, field)
    if (!input || typeof input !== 'string' || input.trim() === '') {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: field + " is required and can't be blank." }),
        };
    }
}