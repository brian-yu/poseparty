import json
import os

import boto3

dynamodb = boto3.resource('dynamodb')

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

    table.delete_item(Key={
        'connectionId': event['requestContext']['connectionId']
    })

    return {
        "statusCode": 200,
        "body": 'Disconnected.'
    }

