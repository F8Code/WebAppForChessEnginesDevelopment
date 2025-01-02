import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable()
export class JwtService implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    let modifiedReq = req;
    if (token) {
      modifiedReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(modifiedReq).pipe(
      catchError(error => {
        if (error.status === 401) {
          // Odśwież token
          return this.authService.refreshToken().pipe(
            switchMap((response: any) => {
              const newToken = response.access;
              this.authService.saveToken(newToken);

              const newReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });

              return next.handle(newReq);
            }),
            catchError(refreshError => {
              this.authService.logout();
              return throwError(refreshError);
            })
          );
        }

        return throwError(error);
      })
    );
  }
}