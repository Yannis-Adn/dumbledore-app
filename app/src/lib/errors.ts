export class AppError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'AppError';
  }
}

export class TokenExpiredError extends AppError {
  readonly source: 'gandalf' | 'panoramix';
  constructor(
    source: 'gandalf' | 'panoramix',
    message?: string,
  ) {
    super(
      message ??
        (source === 'gandalf'
          ? 'Session Moodle expirée. Veuillez rafraîchir votre token MoodleSession.'
          : 'Token Panoramix expiré. Veuillez rafraîchir votre token Panoramix.'),
      'TOKEN_EXPIRED',
    );
    this.source = source;
    this.name = 'TokenExpiredError';
  }
}

export class NetworkError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Erreur réseau. Vérifiez votre connexion internet.', 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class ApiError extends AppError {
  readonly status: number;
  constructor(
    status: number,
    message: string,
  ) {
    super(message, 'API_ERROR');
    this.status = status;
    this.name = 'ApiError';
  }
}
