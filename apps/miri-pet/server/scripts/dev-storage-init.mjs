// 로컬 개발용 S3 호환 저장소(docker-compose의 miri-pet-storage)에 버킷 2개를 만든다. 운영(R2)에서는 쓰지 않는다
// 사용: pnpm storage:init  (R2_ENDPOINT·R2_ACCESS_KEY_ID·R2_SECRET_ACCESS_KEY는 .env에서 읽는다)
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3'

const endpoint = process.env.R2_ENDPOINT
if (!endpoint) {
  console.error('R2_ENDPOINT가 없습니다 — 로컬 개발 저장소 전용 스크립트입니다')
  process.exit(1)
}

const client = new S3Client({
  region: 'auto',
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
})

const buckets = [process.env.R2_PUBLIC_BUCKET || 'miripet-public', process.env.R2_PRIVATE_BUCKET || 'miripet-private']

const createBucket = async (name) => {
  try {
    await client.send(new CreateBucketCommand({ Bucket: name }))
    console.log(`created ${name}`)
  } catch (error) {
    const code = error && error.name
    if (code === 'BucketAlreadyOwnedByYou' || code === 'BucketAlreadyExists') return console.log(`exists ${name}`)
    throw error
  }
}

Promise.all(buckets.map(createBucket)).catch((error) => {
  console.error(error)
  process.exit(1)
})
