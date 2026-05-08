declare const qrcodegen: {
  QrCode: {
    encodeText(
      text: string,
      ecl: {
        ordinal: number
        formatBits: number
      },
    ): {
      size: number
      getModule(x: number, y: number): boolean
    }
    Ecc: {
      LOW: { ordinal: number; formatBits: number }
      MEDIUM: { ordinal: number; formatBits: number }
      QUARTILE: { ordinal: number; formatBits: number }
      HIGH: { ordinal: number; formatBits: number }
    }
  }
}

export = qrcodegen
