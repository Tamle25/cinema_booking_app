// src/types/index.ts

export interface ICinemaSystem {
  _id: string;
  name: string;
  slug: string;
  logo_url?: string;
  color_code?: string;
}

export interface ICinema {
  _id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  cinema_system: ICinemaSystem | string;
  map_url?: string;
}

export interface IRoom {
  _id: string;
  name: string;
  type: string;
  rows: number;
  columns: number;
  total_seats?: number;
}

export interface IShowtime {
  _id: string;
  movie: IMovie;
  cinema: ICinema;
  room: IRoom;
  start_time: string;
  end_time: string;
  price: number;
  booked_seats: string[];
  is_active: boolean;
}

export interface IMovie {
  _id: string;
  title: string;
  slug: string;
  description: string;
  poster_url: string;
  banner_url: string;
  trailer_url: string;
  genre: string;
  duration: number;
  rating: number;   
  release_date: string;
  is_active: boolean;
  createdAt: string;
  status?: string;
}

export interface IBooking {
  _id: string;
  showtime: IShowtime;
  user: string;
  seats: string[];
  total_price: number;
  status: string;
  createdAt: string;
}