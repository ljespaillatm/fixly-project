import React from 'react'
import { CFooter } from '@coreui/react'

const PublicFooter = () => {
  return (
    <CFooter className="px-4 mt-auto border-top">
      <div>
        <span className="fw-semibold">Fixly</span>
        <span className="ms-1 text-body-secondary">© {new Date().getFullYear()}</span>
      </div>
      <div className="ms-auto text-body-secondary small">Conectamos clientes con contratistas de confianza</div>
    </CFooter>
  )
}

export default React.memo(PublicFooter)
