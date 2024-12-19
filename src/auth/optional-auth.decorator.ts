import { UseGuards } from '@nestjs/common'

import { OptionalAuthGuard } from './guards/optional.guard'

export const OptionalAuth = () => UseGuards(OptionalAuthGuard)
