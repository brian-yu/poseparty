import json
import os

import boto3

dynamodb = boto3.resource('dynamodb')
apigateway = boto3.client('apigatewaymanagementapi')


def lambda_handler(event, context):
    """Sample pure Lambda function

    Parameters
    ----------
    event: dict, required
        API Gateway Lambda Proxy Input Format

        Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format

    context: object, required
        Lambda Context runtime methods and attributes

        Context doc: https://docs.aws.amazon.com/lambda/latest/dg/python-context-object.html

    Returns
    ------
    API Gateway Lambda Proxy Output Format: dict

        Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
    """

    table = dynamodb.Table(os.environ['TABLE_NAME'])

    connection_data = table.scan(ProjectionExpression='connectionId')

    post_data = json.loads(event.body)['data']

    for connection_id in connection_data:
        apigateway.post_to_connection(
            ConnectionId=connectionId,
            Data=post_data
        )

    return {
        "statusCode": 200,
        "body": 'Data sent.'
    }

