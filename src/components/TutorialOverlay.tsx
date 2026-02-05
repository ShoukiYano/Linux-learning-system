import React, { useEffect, useState } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';
import { clsx } from 'clsx';

export interface TutorialStep {
  targetId?: string; // ID of the element to highlight. If undefined, show modal in center.
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  currentStep: number;
  onNext: () => void;
  onSkip: () => void;
  isActive: boolean;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  steps,
  currentStep,
  onNext,
  onSkip,
  isActive,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const step = steps[currentStep];

  useEffect(() => {
    if (!isActive || !step) return;

    if (step.targetId) {
      const element = document.getElementById(step.targetId);
      if (element) {
        // Wait a bit for layout to stabilize (e.g. if page just loaded)
        setTimeout(() => {
            setTargetRect(element.getBoundingClientRect());
        }, 100);
        
        // Update rect on resize and scroll
        const updateRect = () => {
             setTargetRect(element.getBoundingClientRect());
        };
        
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, { capture: true, passive: true });
        
        return () => {
          window.removeEventListener('resize', updateRect);
          window.removeEventListener('scroll', updateRect, { capture: true });
        };
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isActive, step]);

  if (!isActive || !step) return null;

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (!targetRect || !step.targetId) {
      // Center position
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const gap = 16;
    let top = 0;
    let left = 0;
    let transform = '';

    // Mobile adjustment: if screen is narrow, force bottom or center to prevent off-screen
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const effectivePosition = isMobile && (step.position === 'left' || step.position === 'right') 
      ? 'bottom' // Force bottom on mobile for side-positioned elements
      : step.position;

    switch (effectivePosition) {
      case 'top':
        top = targetRect.top - gap;
        left = targetRect.left + targetRect.width / 2;
        transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2;
        transform = 'translate(-50%, 0)';
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - gap;
        transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + gap;
        transform = 'translate(0, -50%)';
        break;
      default: // center or fallback
         top = window.innerHeight / 2;
         left = window.innerWidth / 2;
         transform = 'translate(-50%, -50%)';
    }

    // Boundary check specifically for mobile bottom overflow
    if (isMobile && effectivePosition === 'bottom') {
       // If expanding below goes off screen, flip to top or center
       const estimatedHeight = 250; 
       if (top + estimatedHeight > window.innerHeight) {
          // Try top
          if (targetRect.top - gap - estimatedHeight > 0) {
             top = targetRect.top - gap;
             transform = 'translate(-50%, -100%)';
          } else {
             // Fallback to center
             top = window.innerHeight / 2;
             left = window.innerWidth / 2;
             transform = 'translate(-50%, -50%)';
          }
       }
    }

    return { top, left, transform };
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop with "hole" */}
      {isActive && (
        <div className="absolute inset-0 bg-black/60 transition-opacity duration-500 pointer-events-auto">
            {/* If we strictly want a hole, we'd use SVG clipPath or multiple divs. 
                For simplicity in this overlay, we just put a high z-index highlight on top if needed,
                or relying on the user focus. 
                Improved approach: use box-shadow to create the dimming effect around the target.
            */}
            {targetRect && (
                <div 
                    className="absolute border-2 border-primary-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] transition-all duration-500 ease-in-out"
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                    }}
                />
            )}
        </div>
      )}

      {/* Tooltip Card */}
      <div
        className="absolute bg-white dark:bg-slate-800 p-5 md:p-6 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-[90vw] md:w-96 max-w-[90vw] pointer-events-auto transition-all duration-500 ease-out"
        style={getTooltipStyle()}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-2">
            {[...Array(steps.length)].map((_, i) => (
                <div 
                    key={i} 
                    className={clsx(
                        "w-2 h-2 rounded-full transition-colors", 
                        i === currentStep ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-600"
                    )} 
                />
            ))}
          </div>
          <button 
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white flex items-center gap-2">
           {currentStep === steps.length - 1 ? "🎉 " : "💡 "}{step.title}
        </h3>
        <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed text-sm">
          {step.description}
        </p>

        <div className="flex justify-end">
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold shadow-lg shadow-primary-500/20 transition-all hover:scale-105"
          >
            {currentStep === steps.length - 1 ? (
                <>はじめる <Check size={18} /></>
            ) : (
                <>次へ <ChevronRight size={18} /></>
            )}
          </button>
        </div>
        
        {/* Connection Arrow (Simple CSS triangle) */}
        {targetRect && (
             <div 
                className={clsx(
                    "absolute w-4 h-4 bg-white dark:bg-slate-800 rotate-45 border-slate-200 dark:border-slate-700",
                    step.position === 'top' && "bottom-[-8px] left-1/2 -translate-x-1/2 border-b border-r",
                    step.position === 'bottom' && "top-[-8px] left-1/2 -translate-x-1/2 border-t border-l",
                    step.position === 'left' && "right-[-8px] top-1/2 -translate-y-1/2 border-t border-r",
                    step.position === 'right' && "left-[-8px] top-1/2 -translate-y-1/2 border-b border-l",
                )}
             />
        )}
      </div>
    </div>
  );
};
