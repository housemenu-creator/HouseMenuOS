import Button from './Button'
import { Bell, Plus } from 'lucide-react'

export default {
  title: 'Primitives/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
}

export const Primary = {
  args: { children: 'Guardar Cambios', variant: 'primary' },
}

export const Secondary = {
  args: { children: 'Enviar Pedido', variant: 'secondary' },
}

export const Ghost = {
  args: { children: 'Cancelar', variant: 'ghost' },
}

export const Danger = {
  args: { children: 'Eliminar', variant: 'danger' },
}

export const WithIcon = {
  args: { children: 'Agregar', icon: Plus, variant: 'primary' },
}

export const Small = {
  args: { children: 'Editar', size: 'sm', variant: 'ghost' },
}

export const Disabled = {
  args: { children: 'Procesando...', disabled: true, icon: Bell },
}
