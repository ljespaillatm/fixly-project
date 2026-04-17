import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

const CategoryDetail = () => {
  const { category } = useParams()
  const navigate = useNavigate()

  const [services, setServices] = useState([])

  useEffect(() => {
    getServices()
  }, [category])

  async function getServices() {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('category', category)

    setServices(data || [])
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>{category}</h2>

      {services.map(s => (
        <div
          key={s.id}
          onClick={() => navigate(`/service/${s.id}`)}
          style={{ border:'1px solid #ccc', padding:'10px', marginBottom:'10px', cursor:'pointer' }}
        >
          {s.title}
        </div>
      ))}
    </div>
  )
}

export default CategoryDetail