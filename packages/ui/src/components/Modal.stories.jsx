import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'

export default {
  title: 'Primitives/Modal',
  component: Modal,
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' },
  },
}

export const Default = {
  render: function Render(args) {
    const [open, setOpen] = useState(false)
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Abrir Modal</Button>
        <Modal {...args} open={open} onClose={() => setOpen(false)}>
          <p className="text-cm-muted font-bold">
            Contenido del modal. Puedes poner cualquier cosa aquí.
          </p>
        </Modal>
      </div>
    )
  },
  args: { title: 'Confirmar Acción' },
}

export const NoTitle = {
  render: function Render(args) {
    const [open, setOpen] = useState(false)
    return (
      <div>
        <Button onClick={() => setOpen(true)} variant="ghost">Abrir sin Título</Button>
        <Modal {...args} open={open} onClose={() => setOpen(false)}>
          <p className="text-cm-muted font-bold">Modal sin encabezado.</p>
        </Modal>
      </div>
    )
  },
  args: {},
}

export const WithActions = {
  render: function Render(args) {
    const [open, setOpen] = useState(false)
    return (
      <div>
        <Button onClick={() => setOpen(true)} variant="secondary">Confirmar Entrega</Button>
        <Modal {...args} open={open} onClose={() => setOpen(false)}>
          <p className="text-cm-muted text-sm mb-6 font-bold">¿Estás seguro de confirmar esta entrega?</p>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="primary" className="flex-1" onClick={() => setOpen(false)}>Confirmar</Button>
          </div>
        </Modal>
      </div>
    )
  },
  args: { title: 'Confirmar Entrega' },
}
