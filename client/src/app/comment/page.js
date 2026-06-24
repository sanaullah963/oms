import FacebookLiveComments from '@/components/FacebookLiveComments'
import SearchAndMenue from '@/components/SearchAndMenue'
import Link from 'next/link'
import React from 'react'

function page() {
  return (
    <div className='p-1 md:p-3 bg-white border-b border-gray-200 shadow-md'>
      <SearchAndMenue />
      <FacebookLiveComments />
    </div>
  )
}

export default page