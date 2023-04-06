import { clsx } from 'clsx'
import { ReactNode } from 'react'

export interface FormGroup {
  label: ReactNode
  children?: ReactNode
  /** Remove the top padding from the label (required for the label to align with checkbox/radio buttons properly) */
  pt0?: boolean
}
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
