import FacebookLiveComments from '@/components/FacebookLiveComments'
import Link from 'next/link'
import React from 'react'

function page() {
  return (
    <div>
      <p>page hello comment</p>
      <Link href="/">Home page</Link>
      <Link href="/dashboard">Home page</Link>
      <FacebookLiveComments />
    </div>
  )
}

export default page