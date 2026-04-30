import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
// 1. Import the animations provider
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { App } from './app';
import { routes } from './app.routes';
import { authInterceptor } from './auth-interceptor';

bootstrapApplication(App, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withHashLocation()),

    // 2. Add it to your providers array
    provideAnimationsAsync()
  ]
}).catch(err => console.error(err));
