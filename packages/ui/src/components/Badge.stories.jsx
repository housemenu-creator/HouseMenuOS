import Badge from './Badge'
import { Clock, CheckCircle } from 'lucide-react'

export default {
  title: 'Primitives/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'select', options: ['success', 'warning', 'error', 'info', 'neutral'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
}

export const Success = {
  args: { children: 'Completado', variant: 'success' },
}

export const Warning = {
  args: { children: 'Pendiente', variant: 'warning' },
}

export const Error = {
  args: { children: 'Cancelado', variant: 'error' },
}

export const Info = {
  args: { children: 'Delivery', variant: 'info' },
}

export const Neutral = {
  args: { children: 'Cocina', variant: 'neutral' },
}

export const WithIcon = {
  args: { children: 'En Preparación', icon: Clock, variant: 'warning' },
}

export const Small = {
  args: { children: 'Nuevo', size: 'sm', variant: 'success', icon: CheckCircle },
}
