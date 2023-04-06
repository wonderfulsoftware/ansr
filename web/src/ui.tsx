import { clsx } from 'clsx'
import { ReactNode } from 'react'

export function FormGroup(props: FormGroup) {
  return (
    <div className="row">
      <strong className={clsx('col-sm-3 col-form-label', props.pt0 && 'pt-0')}>
        {props.label}
      </strong>
      <div className="col-sm-9">{props.children}</div>
    </div>
  )
}
export interface FormHint {
  children?: ReactNode
}
export function FormHint(props: FormHint) {
  return (
    <div className="mt-1">
      <small className="form-text text-muted">{props.children}</small>
    </div>
  )
}
