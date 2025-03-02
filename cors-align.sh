export AWS_PROFILE="solutions"
aws s3 ls
aws s3api put-bucket-cors --bucket amplify-ofmawsdemoenhanced-dev-5108d-deployment --cors-configuration file://cors-config.json
aws s3api get-bucket-cors --bucket amplify-ofmawsdemoenhanced-dev-5108d-deployment