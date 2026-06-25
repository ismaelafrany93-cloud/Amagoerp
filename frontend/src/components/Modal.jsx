function Modal({ open, onClose, children }) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose}>X</button>
        {children}
      </div>
    </div>
  )
}

export default Modal