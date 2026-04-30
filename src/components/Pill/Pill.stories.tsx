import type { Meta, StoryObj } from '@storybook/react';
import { Pill } from './Pill';

const meta: Meta<typeof Pill> = {
  title: 'Primitives/Pill',
  component: Pill,
  tags: ['autodocs'],
  args: { children: '+18.72%' },
  argTypes: { variant: { control: 'select', options: ['neutral', 'accent', 'gain', 'loss'] } },
};
export default meta;

type Story = StoryObj<typeof Pill>;
export const Neutral: Story = { args: { variant: 'neutral', children: 'beta' } };
export const Accent: Story = { args: { variant: 'accent', dot: true, children: 'Live' } };
export const Gain: Story = { args: { variant: 'gain', children: '+₩1,872,300' } };
export const Loss: Story = { args: { variant: 'loss', children: '−2.41%' } };
