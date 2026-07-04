export interface ResourceTypeInfo {
  /** human label used both for the OKF `type` field (drives icon lookup via findAwsIcon) and `aws_resource_type` */
  label: string;
}

/**
 * Maps a Terraform resource type to the label vocabulary findAwsIcon()
 * (src/lib/aws-icons.ts) already resolves against aws-icon-manifest.json.
 * Extend this table as new resource types need to be scanned — it's a plain
 * lookup, not a placeholder.
 */
export const TERRAFORM_RESOURCE_TYPES: Record<string, ResourceTypeInfo> = {
  aws_lambda_function: { label: "AWS Lambda Function" },
  aws_dynamodb_table: { label: "Amazon DynamoDB Table" },
  aws_sqs_queue: { label: "Amazon SQS Queue" },
  aws_sns_topic: { label: "Amazon SNS Topic" },
  aws_apigatewayv2_api: { label: "Amazon API Gateway" },
  aws_api_gateway_rest_api: { label: "Amazon API Gateway" },
  aws_s3_bucket: { label: "Amazon S3 Bucket" },
  aws_cloudfront_distribution: { label: "Amazon CloudFront Distribution" },
};

export function resourceTypeInfo(terraformType: string): ResourceTypeInfo | undefined {
  return TERRAFORM_RESOURCE_TYPES[terraformType];
}
