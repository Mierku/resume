import crypto from 'crypto'

export function buildWechatPayAuthorization(input: {
  mchId: string
  serialNo: string
  privateKeyPem: string
  method: string
  pathnameWithQuery: string
  timestamp?: number
  nonce?: string
  body?: string
}) {
  const timestamp = String(input.timestamp ?? Math.floor(Date.now() / 1000))
  const nonce = input.nonce ?? crypto.randomBytes(16).toString('hex')
  const body = input.body ?? ''
  const message = `${input.method.toUpperCase()}\n${input.pathnameWithQuery}\n${timestamp}\n${nonce}\n${body}\n`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(message)
  signer.end()

  const signature = signer.sign(input.privateKeyPem, 'base64')

  return {
    authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${input.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${input.serialNo}"`,
    timestamp,
    nonce,
    signature,
    message,
  }
}

export function verifyWechatPaySignature(input: {
  serial: string
  signature: string
  timestamp: string
  nonce: string
  body: string
  publicKeyPem: string
}) {
  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(`${input.timestamp}\n${input.nonce}\n${input.body}\n`)
  verifier.end()
  return verifier.verify(input.publicKeyPem, input.signature, 'base64')
}

export function decryptWechatPayResource(input: {
  apiV3Key: string
  associatedData?: string
  nonce: string
  ciphertext: string
}) {
  const key = Buffer.from(input.apiV3Key, 'utf8')
  const ciphertext = Buffer.from(input.ciphertext, 'base64')
  const authTag = ciphertext.subarray(ciphertext.length - 16)
  const data = ciphertext.subarray(0, ciphertext.length - 16)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(input.nonce, 'utf8'))

  if (input.associatedData) {
    decipher.setAAD(Buffer.from(input.associatedData, 'utf8'))
  }

  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}
