import { HttpInterceptorFn } from '@angular/common/http';
import { TaApiService } from '../../src/app/ta/services/ta-api.service'; // تأكدي من المسار الصح للـ Service

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 🎯 هنا الـ Master Move: بنشيك لو الـ Request متعلم عليه إنه يتخطى الـ Auth أو رايح لـ جوجل
  if (req.context.get(TaApiService.BYPASS_AUTH) || req.url.includes('googleapis.com') || req.url.includes('corsproxy')) {
  return next(req); // مرر الطلب "نظيف" بدون Bearer Token
}
  // الكود القديم بتاعك اللي بيضيف التوكن سيبيه زي ما هو تحت السطر ده:
  const token = localStorage.getItem('token');
  const clonedReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });

  return next(clonedReq);
};
