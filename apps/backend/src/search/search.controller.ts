import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Búsqueda inteligente en todas las entidades' })
  @ApiQuery({ name: 'q', required: true })
  search(@Query('q') q: string) {
    return this.searchService.search(q);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Sugerencias rápidas para autocompletado' })
  @ApiQuery({ name: 'q', required: true })
  suggestions(@Query('q') q: string) {
    return this.searchService.suggestions(q);
  }
}
