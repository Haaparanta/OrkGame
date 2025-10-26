// Static image imports for avatar images
// This ensures images are bundled correctly in both dev and production

import warbossImg from '@/../../public/ork-avatar-warboss.png'
import rokitBoyImg from '@/../../public/ork-avatar-rokkit-boy.png'
import burnaBoyImg from '@/../../public/ork-avatar-burna-boy.png'
import enemyImg from '@/../../public/ork-avatar-enemy.png'

export const avatarImages = {
  warboss: '/ork-avatar-warboss.png',
  'rokkit-boy': '/ork-avatar-rokkit-boy.png',
  'burna-boy': '/ork-avatar-burna-boy.png',
  enemy: '/ork-avatar-enemy.png',
}

export type AvatarId = keyof typeof avatarImages
