declare module "qrcode" {
  interface ToDataUrlOptions {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  interface QrCode {
    toDataURL(text: string, options?: ToDataUrlOptions): Promise<string>;
  }

  const QRCode: QrCode;
  export default QRCode;
}
