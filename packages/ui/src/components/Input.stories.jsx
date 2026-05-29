import Input from './Input'
import { Search, User } from 'lucide-react'

export default {
  title: 'Primitives/Input',
  component: Input,
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
}

export const Default = {
  args: { placeholder: 'Nombre del producto', label: 'Producto' },
}

export const WithIcon = {
  args: { placeholder: 'Buscar...', icon: Search, label: 'Buscar' },
}

export const WithError = {
  args: { placeholder: 'Correo electrónico', label: 'Email', error: 'Campo requerido', icon: User },
}

export const Disabled = {
  args: { placeholder: 'Campo deshabilitado', label: 'Inactivo', disabled: true, value: 'Valor fijo' },
}

export const NoLabel = {
  args: { placeholder: 'Escribe algo...' },
}
