/**
 * 라우트/서비스에서 명시적으로 throw 하는 HTTP 에러.
 * errorHandler 가 envelope 로 변환한다.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
