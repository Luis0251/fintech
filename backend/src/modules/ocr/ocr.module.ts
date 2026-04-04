import { Module, Global } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { PrismaModule } from '../../common/prisma.module';
import { EncryptionService } from '../../common/encryption.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [OcrService, EncryptionService],
  exports: [OcrService],
})
export class OcrModule {}