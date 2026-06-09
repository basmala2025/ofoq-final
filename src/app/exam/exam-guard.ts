import { CanDeactivateFn } from '@angular/router';
import { ExamEditorComponent } from '../student/exam-editor/exam-editor'; // تأكدي من المسار بتاعك

export const confirmExitGuard: CanDeactivateFn<ExamEditorComponent> = (component) => {
 // بدل السطر القديم المكسور، نخليه يتشيك على الـ violationCount أو الـ state الحالية للـ Component
if (component.violationCount >= 3 || component.isLoading) {
    return true; // يسمح له يخرج لو اتطرد خلاص
}

// لو حاول يخرج يدوي والامتحان شغال، نطلعله الـ Confirm التحذيري القياسي
return confirm('🚨 WARNING: Leaving this page will NOT pause the exam timer. Your progress will be captured as-is. Are you sure?');
};
