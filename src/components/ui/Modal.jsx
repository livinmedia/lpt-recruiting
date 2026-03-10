// RKRT.in UI Components - Modal
// Reusable modal dialog component

import T from '../../lib/theme';

export function Modal({ children, onClose, maxWidth = 500 }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.b}`,
          borderRadius: 16,
          padding: "32px 28px",
          maxWidth,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <div
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              cursor: "pointer",
              color: T.s,
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            ✕
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * Confirmation modal for delete actions
 */
export function DeleteModal({ title, message, onConfirm, onCancel, loading }) {
  return (
    <Modal onClose={onCancel} maxWidth={400}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🗑️</div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: T.t,
            marginBottom: 8,
          }}
        >
          {title || "Delete?"}
        </div>
        <div
          style={{
            fontSize: 15,
            color: T.s,
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          {message || "This action cannot be undone."}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: 8,
              background: T.d,
              border: `1px solid ${T.b}`,
              color: T.s,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Cancel
          </div>
          <div
            onClick={!loading ? onConfirm : null}
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: 8,
              background: T.r,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              textAlign: "center",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Deleting…" : "Delete Forever"}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default Modal;
