function Card({ title, value }) {
  return (
    <div className="card">
      <p style={{
        color: '#666',
        fontSize: '14px',
        marginBottom: '10px'
      }}>
        {title}
      </p>

      <h2 style={{
        margin: 0,
        color: '#1E88E5'
      }}>
        {value}
      </h2>
    </div>
  )
}

export default Card