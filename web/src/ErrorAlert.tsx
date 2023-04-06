export interface ErrorAlert {
  error: any
}
export function ErrorAlert(props: ErrorAlert) {
  return <div className="alert alert-danger">{String(props.error)}</div>
}
