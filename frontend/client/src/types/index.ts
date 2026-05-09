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
  review_count: number;
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
  combos?: IBookingCombo[];
}

// Combo bắp nước
export interface ICombo {
  _id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: 'combo' | 'drink' | 'snack';
  is_active: boolean;
  is_popular: boolean;
  cinema_system?: ICinemaSystem | string;
}

// Combo đã chọn (dùng trong state frontend)
export interface ISelectedCombo {
  combo: ICombo;
  quantity: number;
}

// Combo lưu trong booking (snapshot)
export interface IBookingCombo {
  combo_id: string;
  name: string;
  price: number;
  quantity: number;
}

// Hệ thống rạp đối tác (alias cho cinema system dùng ở homepage)
export interface ICinemaChain {
  _id: string;
  name: string;
  slug: string;
  logo_url?: string;
  color_code?: string;
}

// Review phim
export interface IReviewUser {
  _id: string;
  full_name: string;
  avatar_url?: string;
}

export interface IReview {
  _id: string;
  user: IReviewUser;
  movie: IMovie | string;
  rating: number;
  content: string;
  is_verified: boolean;
  likes_count: number;
  is_liked?: boolean;
  createdAt: string;
}

export interface IFeaturedReview {
  movie: IMovie;
  rating_avg: number;
  review_count: number;
  reviews: IReview[];
}