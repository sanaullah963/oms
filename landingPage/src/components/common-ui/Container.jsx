import React from 'react'

function Container({children}) {
  return (
    <div className='relative mx-auto max-w-3xl px-2'>{children}</div>
  )
}

export default Container