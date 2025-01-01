'use client';

import React, {
  forwardRef,
  ForwardedRef,
  ChangeEvent,
  KeyboardEvent,
} from 'react';
import Spinner from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AsteriskIcon, AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  handleChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  variant?: 'unstyled' | 'textarea';
  fontSize?: string;
  weight?: string;
  placeholderStyle?: string;
  loading?: boolean;
  prefix?: string;
  required?: boolean;
  disabled?: boolean;
  tooltip?: string;
  accept?: string;
  readOnly?: boolean;
  showError?: boolean;
  errorMessage?: string;
  htmlFor?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    variant,
    fontSize = 'text-sm',
    weight = 'font-regular',
    type = 'text',
    placeholder,
    value,
    name,
    label,
    htmlFor,
    handleChange,
    handleClick,
    handleKeyDown,
    autoFocus = false,
    placeholderStyle = 'placeholder-typography-weak',
    loading,
    icon,
    prefix,
    required,
    disabled,
    tooltip = 'false',
    hint,
    accept,
    readOnly,
    showError = false,
    errorMessage = 'This field is required',
  },
  ref: ForwardedRef<HTMLInputElement>,
) {
  if (variant == 'unstyled' || type == 'file') {
    return (
      <input
        disabled={disabled}
        ref={ref}
        value={value}
        type={type}
        placeholder={placeholder}
        name={name}
        id={htmlFor}
        className={`${className} ${fontSize} ${weight} text-high-contrast-text ${placeholderStyle} outline-none ${showError ? 'border-error-stroke-weak' : ''}`}
        onChange={handleChange}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        required={required}
        accept={accept}
        readOnly={readOnly}
      />
    );
  }

  if (variant == 'textarea') {
    const Label = ({
      htmlFor,
      label,
      required,
      tooltip,
      hint,
    }: {
      htmlFor: string;
      label: string;
      required?: boolean;
      tooltip?: string;
      hint?: React.ReactNode;
    }) => (
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className={`text-sm ${weight} flex items-center gap-2`}
        >
          {label}
          {required && tooltip === 'true' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-stroke-weak p-2.5 text-typography-strong">
                    <span>
                      <AsteriskIcon width={14} height={14} />
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Required</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </label>
        {hint && <span className="text-sm text-typography-weak">{hint}</span>}
      </div>
    );

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <Label
            htmlFor={htmlFor || ''}
            label={label}
            required={required}
            tooltip={tooltip}
            hint={hint}
          />
        )}
        <textarea
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          name={name}
          id={htmlFor}
          className={`${fontSize} ${weight} transition-effect group flex items-center justify-between overflow-hidden rounded-lg border ${showError ? 'hover:border-error-stroke-medium border-error-stroke-weak' : 'border-stroke-weak hover:border-stroke-medium'} bg-fill p-3 text-typography-strong outline-none ${className} min-h-[100px]`}
          onChange={handleChange}
          autoFocus={autoFocus}
          required={required}
          readOnly={readOnly}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={htmlFor}
            className={`text-sm ${weight} flex items-center gap-2`}
          >
            {label}
            {required && tooltip === 'true' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-stroke-weak p-2.5 text-typography-strong">
                      <span>
                        <AsteriskIcon width={14} height={14} />
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Required</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </label>
          {hint && <span className="text-sm text-typography-weak">{hint}</span>}
        </div>
      )}
      <div
        className={`${disabled ? 'opacity-70' : showError ? '' : 'hover:border-stroke-medium'} transition-effect bg-app-bg group flex items-center justify-between overflow-hidden rounded-lg border ${showError ? 'hover:border-error-stroke-medium border-error-stroke-weak' : 'border-stroke-weak'} bg-fill`}
      >
        <div className="flex w-full">
          {prefix && (
            <div className="p select-none border-r border-stroke-weak bg-fill p-3 font-medium group-hover:border-stroke-medium">
              <span className={`${fontSize} font-medium`}>{prefix}</span>
            </div>
          )}

          <input
            disabled={disabled}
            ref={ref}
            value={value}
            type={type}
            placeholder={placeholder}
            name={name}
            id={htmlFor}
            className={`${className} ${fontSize} ${weight} ${disabled ? 'cursor-not-allowed' : ''} placeholder-typography-weak/50 flex-grow bg-transparent p-3 text-typography-strong outline-none`}
            onChange={handleChange}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocus}
            data-autofocus={autoFocus}
            required={required}
            readOnly={readOnly}
          />
        </div>

        {icon && (
          <div className="flex items-center justify-center pr-3">
            {loading ? (
              <span className="">
                <Spinner variant="light" />
              </span>
            ) : (
              <span className="">{icon}</span>
            )}
          </div>
        )}

        {showError && (
          <div className="flex items-center justify-center pr-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="h-4 w-4 text-error-stroke-weak" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{errorMessage}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
});

export default Input;
