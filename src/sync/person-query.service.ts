import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PersonMongo } from './person-mongo.schema';

@Injectable()
export class PersonQueryService {
  constructor(
    @InjectModel(PersonMongo.name) private personMongoModel: Model<PersonMongo>,
  ) {}

  async findAll(): Promise<PersonMongo[]> {
    return this.personMongoModel.find().exec();
  }

  async findOne(id: string): Promise<PersonMongo> {
    const person = await this.personMongoModel.findOne({ id }).exec();
    
    if (!person) {
      throw new NotFoundException(`Person with id ${id} not found`);
    }
    
    return person;
  }
}
