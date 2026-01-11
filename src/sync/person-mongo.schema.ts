import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'persons', timestamps: true })
export class PersonMongo extends Document {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PersonMongoSchema = SchemaFactory.createForClass(PersonMongo);
