import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PersonMongo } from './person-mongo.schema';

export interface PersonResponse {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PersonQueryService {
  constructor(
    @InjectModel(PersonMongo.name) private personMongoModel: Model<PersonMongo>,
  ) {}

  async findAll(): Promise<PersonResponse[]> {
    const persons = await this.personMongoModel.find().exec();
    return persons.map(this.toResponse);
  }

  async findOne(id: string): Promise<PersonResponse> {
    const person = await this.personMongoModel.findOne({ id }).exec();
    
    if (!person) {
      throw new NotFoundException(`Person with id ${id} not found`);
    }
    
    return this.toResponse(person);
  }

  private toResponse(person: PersonMongo): PersonResponse {
    return {
      id: person.id,
      name: person.name,
      email: person.email,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    };
  }
}
