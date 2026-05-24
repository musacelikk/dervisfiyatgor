type IconProps = { className?: string };

export function IconCamera({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 0 1 8.5 5h7a2.31 2.31 0 0 1 1.673.827l1.44 1.44A2.31 2.31 0 0 0 19.5 8v8a2.31 2.31 0 0 1-.827 1.673l-1.44 1.44A2.31 2.31 0 0 1 15.5 20h-7a2.31 2.31 0 0 1-1.673-.827l-1.44-1.44A2.31 2.31 0 0 1 4.5 16V8c0-.626.24-1.227.673-1.673l1.44-1.44Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

export function IconBarcode({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" d="M4 7V5m0 12v-2M7 5v14M10 5v2m0 10v2M13 5v2m0 10v2M16 5v14M19 5v2m0 10v2M22 7V5" />
    </svg>
  );
}

export function IconSearch({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.2-5.2M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
    </svg>
  );
}

export function IconTag({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A2 2 0 0 1 3 12V7a4 4 0 0 1 4-4Z"
      />
    </svg>
  );
}

export function IconLayers({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 6.429 4.5m0 10.5 5.571-3 5.571 3M21.75 7.5l-4.179-2.25m0 10.5 5.571-3 5.571 3M12 4.5v15"
      />
    </svg>
  );
}
