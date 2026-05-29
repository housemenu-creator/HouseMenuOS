import Card from './Card'

export default {
  title: 'Primitives/Card',
  component: Card,
  argTypes: {
    variant: { control: 'select', options: ['vibrant', 'glass', 'flat'] },
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
  },
}

export const Vibrant = {
  args: {
    variant: 'vibrant',
    children: (
      <>
        <Card.Header>Total del Día</Card.Header>
        <Card.Body>
          <p className="text-3xl font-black">S/ 1,280.50</p>
        </Card.Body>
      </>
    ),
  },
}

export const Glass = {
  args: {
    variant: 'glass',
    children: (
      <>
        <Card.Header>Pedidos Activos</Card.Header>
        <Card.Body>
          <p className="text-3xl font-black">12</p>
        </Card.Body>
      </>
    ),
  },
}

export const Flat = {
  args: {
    variant: 'flat',
    children: (
      <>
        <Card.Header>Promedio</Card.Header>
        <Card.Body>
          <p className="text-2xl font-black">4.8 ★</p>
        </Card.Body>
      </>
    ),
  },
}

export const NoHeader = {
  args: {
    variant: 'vibrant',
    children: (
      <Card.Body>
        <p className="text-cm-muted text-sm">Contenido sin encabezado</p>
      </Card.Body>
    ),
  },
}
