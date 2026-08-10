import React from 'react'
import TemplateOneBody from '@/components/TemplateOneBody'
async function page({params}) {
  const { slug } = await params;

  return (
    <div><TemplateOneBody slug={slug}/></div>
  )
}

export default page